#!/usr/bin/env python3
"""Линтер Dify DSL для workflow Eva: ловит то, что Dify при импорте молча пропускает.

Работает и с ручным форматом 0.6.0 (`code: |`), и с экспортом Dify 0.7.0.
Нужен PyYAML (`pip install pyyaml`).

    python3 scripts/dsl_lint.py dsl/eva-client-service.yml
    python3 scripts/dsl_lint.py export.yml --json
    python3 scripts/dsl_lint.py dsl/*.yml --strict      # предупреждения тоже валят прогон

Коды выхода: 0 чисто, 1 есть ошибки (или предупреждения при --strict), 2 файл не разобран.

Проверки (id стабильные, на них можно ссылаться в ревью):
  G01 узел без исходящего ребра (кроме end); у if-else — каждая ветка, включая else
  G02 узел недостижим из start
  G03 ребро ссылается на несуществующий узел или несуществующую ветку if-else
  G04 нет ноды end или она недостижима
  V01 {{#node.var#}} ссылается на неизвестный узел или переменную
  V02 value_selector / variable_selector ссылается на неизвестный узел или переменную
  V03 {{#env.X#}} без переменной окружения X
  V04 variable-aggregator смешивает типы переменных
  C01 код code-ноды не компилируется
  C02 в коде нет def main
  C03 аргументы main не совпадают с variables ноды
  C04 return-словарь не содержит объявленный output (лучшая догадка по литералам)
  C05 import urllib / requests в code-ноде: sandbox Dify их не гарантирует
  L01 llm-нода без модели
  L02 Claude 4.6+ (sonnet-5, opus-5, fable) с temperature/top_p/top_k: API вернёт 400
  H01 заголовок HTTP с подчёркиванием: nginx его выбросит
  H02 URL HTTP-ноды с путём без завершающего слэша перед ?: Django ответит 301, Dify редирект не разворачивает
  H03 HTTP-нода без error_strategy: ошибка API уронит весь прогон
  S01 select-переменная start без options
  F01 FLOW_VERSION объявлена с разными значениями в разных нодах
  F02 FLOW_VERSION не похожа на X.Y.Z
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    print("нужен PyYAML: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

TEMPLATE_RE = re.compile(r"\{\{#([A-Za-z0-9_.\-]+)#\}\}")
SYS_VARS = {"query", "files", "user_id", "app_id", "workflow_id", "workflow_run_id", "conversation_id", "dialogue_count"}
SAMPLING_FORBIDDEN_MODELS = re.compile(r"claude-(sonnet-5|opus-5|opus-4-[78]|fable)")

# Выходы нод по типу. None — выходы берём из самой ноды.
STATIC_OUTPUTS = {
    "llm": {"text": "string", "usage": "object"},
    "knowledge-retrieval": {"result": "array[object]"},
    "http-request": {"body": "string", "status_code": "number", "headers": "object", "files": "array[file]"},
    "if-else": {},
    "end": {},
    "answer": {"answer": "string"},
}
START_TYPES = {"text-input": "string", "paragraph": "string", "select": "string", "number": "number",
               "file": "file", "file-list": "array[file]"}


class Report:
    def __init__(self):
        self.items: list[dict] = []

    def add(self, level: str, code: str, node: str, msg: str):
        self.items.append({"level": level, "code": code, "node": node, "message": msg})

    def error(self, code, node, msg):
        self.add("error", code, node, msg)

    def warn(self, code, node, msg):
        self.add("warning", code, node, msg)

    def counts(self):
        e = sum(1 for i in self.items if i["level"] == "error")
        return e, len(self.items) - e


def load(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def node_outputs(node: dict) -> dict[str, str] | None:
    data = node.get("data") or {}
    t = data.get("type")
    if t == "start":
        return {v["variable"]: START_TYPES.get(v.get("type"), "string") for v in data.get("variables") or []}
    if t == "code":
        return {k: (v or {}).get("type", "string") for k, v in (data.get("outputs") or {}).items()}
    if t == "variable-aggregator":
        return {"output": data.get("output_type", "string")}
    if t in STATIC_OUTPUTS:
        return dict(STATIC_OUTPUTS[t])
    return None  # неизвестный тип: ссылки на него не проверяем


def walk_strings(obj, path=""):
    """Все строки внутри data ноды с путём до них."""
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk_strings(v, f"{path}.{k}" if path else str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk_strings(v, f"{path}[{i}]")


def walk_selectors(obj, path=""):
    """Все списки вида [node, var] под ключами *_selector / variables агрегатора."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{path}.{k}" if path else str(k)
            if k.endswith("selector") and isinstance(v, list) and v and all(isinstance(x, str) for x in v):
                yield p, v
            else:
                yield from walk_selectors(v, p)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk_selectors(v, f"{path}[{i}]")


def check_graph(nodes: dict, edges: list, rep: Report):
    by_id = {nid: n for nid, n in nodes.items()}
    out_edges: dict[str, list] = {nid: [] for nid in by_id}
    for e in edges:
        src, dst = e.get("source"), e.get("target")
        if src not in by_id:
            rep.error("G03", src or "?", f"ребро {e.get('id')} из несуществующего узла")
            continue
        if dst not in by_id:
            rep.error("G03", src, f"ребро {e.get('id')} в несуществующий узел {dst!r}")
            continue
        handle = e.get("sourceHandle", "source")
        data = by_id[src].get("data") or {}
        if data.get("type") == "if-else":
            valid = {c.get("case_id") or c.get("id") for c in data.get("cases") or []} | {"false", "true"}
            if handle not in valid:
                rep.error("G03", src, f"ребро {e.get('id')} с несуществующей ветки {handle!r}")
        out_edges[src].append(handle)

    for nid, n in by_id.items():
        data = n.get("data") or {}
        t = data.get("type")
        if t == "end":
            continue
        handles = out_edges[nid]
        if t == "if-else":
            expected = [c.get("case_id") or c.get("id") for c in data.get("cases") or []] + ["false"]
            for h in expected:
                if h not in handles:
                    rep.error("G01", nid, f"ветка {h!r} if-else никуда не ведёт: прогон на ней завершится без end")
        elif not handles:
            rep.error("G01", nid, "нет исходящего ребра")

    starts = [nid for nid, n in by_id.items() if (n.get("data") or {}).get("type") == "start"]
    if not starts:
        rep.error("G02", "start", "нет ноды start")
        return
    seen, stack = set(), list(starts)
    adj: dict[str, list] = {nid: [] for nid in by_id}
    for e in edges:
        if e.get("source") in adj and e.get("target") in by_id:
            adj[e["source"]].append(e["target"])
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        stack.extend(adj[cur])
    for nid in by_id:
        if nid not in seen:
            rep.error("G02", nid, "недостижим из start")
    ends = [nid for nid, n in by_id.items() if (n.get("data") or {}).get("type") == "end"]
    if not ends:
        rep.error("G04", "end", "нет ноды end")
    elif not any(e in seen for e in ends):
        rep.error("G04", ends[0], "end недостижим из start")


def check_references(nodes: dict, env: set, rep: Report):
    outputs = {nid: node_outputs(n) for nid, n in nodes.items()}

    def resolve(node_id: str, var: str | None, where: str, code: str, owner: str):
        if node_id == "env":
            if var not in env:
                rep.error("V03", owner, f"{where}: env.{var} не объявлена в environment_variables")
            return
        if node_id in ("sys", "conversation"):
            return
        if node_id not in nodes:
            rep.error(code, owner, f"{where}: узел {node_id!r} не существует")
            return
        outs = outputs[node_id]
        if outs is None or var is None:
            return
        if var not in outs:
            rep.error(code, owner, f"{where}: у {node_id} нет выхода {var!r} (есть: {', '.join(outs) or 'ничего'})")

    for nid, n in nodes.items():
        data = n.get("data") or {}
        for path, s in walk_strings(data):
            if path.startswith("code"):
                continue  # в коде плейсхолдеры Dify не подставляются
            for ref in TEMPLATE_RE.findall(s):
                if ref == "context":
                    continue
                parts = ref.split(".")
                resolve(parts[0], parts[1] if len(parts) > 1 else None, path, "V01", nid)
        for path, sel in walk_selectors(data):
            resolve(sel[0], sel[1] if len(sel) > 1 else None, path, "V02", nid)
        if data.get("type") == "variable-aggregator":
            types = set()
            for sel in data.get("variables") or []:
                if isinstance(sel, list) and len(sel) >= 2:
                    resolve(sel[0], sel[1], "variables", "V02", nid)
                    outs = outputs.get(sel[0])
                    if outs and sel[1] in outs:
                        types.add(outs[sel[1]])
            if len(types) > 1:
                rep.error("V04", nid, f"агрегатор смешивает типы: {sorted(types)}")


def check_code(nodes: dict, rep: Report) -> dict[str, str]:
    versions: dict[str, str] = {}
    for nid, n in nodes.items():
        data = n.get("data") or {}
        if data.get("type") != "code":
            continue
        code = data.get("code") or ""
        if (data.get("code_language") or "python3") != "python3":
            continue
        try:
            tree = ast.parse(code)
        except SyntaxError as exc:
            rep.error("C01", nid, f"код не компилируется: {exc.msg} (строка {exc.lineno})")
            continue
        for m in re.finditer(r'^FLOW_VERSION\s*=\s*"([^"]+)"', code, re.M):
            versions[nid] = m.group(1)
        if any(
            isinstance(n, (ast.Import, ast.ImportFrom)) and any(
                name == "requests" or name.startswith("requests.") or name in ("urllib.request", "urllib.error")
                for name in ([n.module or ""] if isinstance(n, ast.ImportFrom) else [a.name for a in n.names])
            ) for n in ast.walk(tree)
        ):
            rep.warn("C05", nid, "import urllib/requests: sandbox Dify их не гарантирует")
        main = next((f for f in ast.walk(tree) if isinstance(f, ast.FunctionDef) and f.name == "main"), None)
        if main is None:
            rep.error("C02", nid, "нет функции main")
            continue
        params = [a.arg for a in main.args.args + main.args.kwonlyargs]
        required = {a.arg for a in main.args.args[:len(main.args.args) - len(main.args.defaults)]}
        required.update(a.arg for a, default in zip(main.args.kwonlyargs, main.args.kw_defaults) if default is None)
        declared = [v.get("variable") for v in data.get("variables") or []]
        if required - set(declared) or (set(declared) - set(params) and main.args.kwarg is None) or main.args.posonlyargs:
            rep.error("C03", nid, f"аргументы main {params} не совпадают с variables {declared}")
        outputs = set((data.get("outputs") or {}).keys())
        literal_returns = []
        # Только return внутри main (включая вложенные помощники вроде pack):
        # словари из вспомогательных функций уровня модуля выходами ноды не являются.
        for node in ast.walk(main):
            if isinstance(node, ast.Return) and isinstance(node.value, ast.Dict):
                keys = {k.value for k in node.value.keys if isinstance(k, ast.Constant) and isinstance(k.value, str)}
                if len(keys) == len(node.value.keys):
                    literal_returns.append(keys)
        for keys in literal_returns:
            missing = outputs - keys
            if missing and keys:
                rep.warn("C04", nid, f"return без объявленных выходов {sorted(missing)}; Dify скажет «Output ... is missing»")
    return versions


def check_llm_http_start(nodes: dict, rep: Report):
    for nid, n in nodes.items():
        data = n.get("data") or {}
        t = data.get("type")
        for form in data.get("default_value") or []:
            typ, value = form.get("type", ""), form.get("value")
            if typ == "object" or typ.startswith("array"):
                if not isinstance(value, str):
                    rep.error("H04", nid, f"fallback {form.get('key')}: {typ} должен быть JSON-строкой для редактора Dify")
                    continue
                try:
                    parsed = json.loads(value)
                    expected = dict if typ == "object" else list
                    if not isinstance(parsed, expected):
                        raise ValueError("неверный тип JSON")
                except (ValueError, TypeError):
                    rep.error("H04", nid, f"fallback {form.get('key')}: некорректный JSON для {typ}")
        if t == "llm":
            model = data.get("model") or {}
            if not model.get("name"):
                rep.error("L01", nid, "у llm-ноды нет модели")
            params = model.get("completion_params") or {}
            if SAMPLING_FORBIDDEN_MODELS.search(str(model.get("name", ""))):
                bad = [k for k in ("temperature", "top_p", "top_k") if k in params]
                if bad:
                    rep.error("L02", nid, f"{model['name']} отклоняет {bad}: убрать из completion_params")
        elif t == "http-request":
            headers = data.get("headers") or ""
            for line in str(headers).splitlines():
                name = line.split(":", 1)[0].strip()
                if "_" in name:
                    rep.error("H01", nid, f"заголовок {name!r} с подчёркиванием не доедет через nginx")
            url = str(data.get("url") or "")
            base = url.split("?", 1)[0]
            path_part = re.sub(r"\{\{#[^#]+#\}\}", "", base)
            if "?" in url and path_part and not base.endswith("/") and not base.endswith("#}}"):
                rep.warn("H02", nid, f"URL {url!r}: путь без завершающего слэша перед ?, Django ответит 301")
            if not data.get("error_strategy"):
                rep.warn("H03", nid, "нет error_strategy: ошибка API уронит весь прогон вместо fallback")
        elif t == "start":
            for v in data.get("variables") or []:
                if v.get("type") == "select" and not v.get("options"):
                    rep.error("S01", nid, f"select {v.get('variable')} без options")


def lint(path: Path, rep: Report) -> None:
    doc = load(path)
    wf = (doc or {}).get("workflow") or {}
    graph = wf.get("graph") or {}
    nodes_list = graph.get("nodes") or []
    nodes = {n.get("id"): n for n in nodes_list}
    if len(nodes) != len(nodes_list):
        rep.error("G03", "graph", "дублирующиеся id узлов")
    edges = graph.get("edges") or []
    env = {e.get("name") for e in wf.get("environment_variables") or []}

    check_graph(nodes, edges, rep)
    check_references(nodes, env, rep)
    versions = check_code(nodes, rep)
    check_llm_http_start(nodes, rep)
    if len(set(versions.values())) > 1:
        rep.error("F01", ", ".join(versions), f"FLOW_VERSION расходится: {versions}")
    for nid, v in versions.items():
        if not re.fullmatch(r"\d+\.\d+\.\d+", v):
            rep.error("F02", nid, f"FLOW_VERSION {v!r} не X.Y.Z")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--strict", action="store_true", help="предупреждения считаются ошибками")
    args = ap.parse_args()

    rc = 0
    for f in args.files:
        path = Path(f)
        rep = Report()
        try:
            lint(path, rep)
        except Exception as exc:  # noqa: BLE001
            print(f"{path}: не разобран: {exc}", file=sys.stderr)
            return 2
        errors, warnings = rep.counts()
        if args.json:
            print(json.dumps({"file": str(path), "errors": errors, "warnings": warnings, "items": rep.items},
                             ensure_ascii=False, indent=2))
        else:
            for it in rep.items:
                print(f"{path.name}: [{it['code']}/{it['level']}] {it['node']}: {it['message']}")
            print(f"{path.name}: ошибок {errors}, предупреждений {warnings}")
        if errors or (args.strict and warnings):
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())
