"""Create ignored Dify import copies with declared environment values from .env."""
import argparse
import copy
import os
from pathlib import Path
import subprocess
import tempfile

from dotenv import dotenv_values
import yaml

ROOT = Path(__file__).resolve().parents[1]


def populate(doc, values):
    result = copy.deepcopy(doc)
    missing = []
    for var in result.get('workflow', {}).get('environment_variables', []):
        name = var['name']
        value = values.get(name)
        if value is not None and value != '':
            if var.get('value_type') == 'number':
                try:
                    value = float(value)
                except ValueError:
                    raise ValueError(f'{name}: expected a number') from None
            var['value'] = value
        if var.get('value_type') == 'secret' and not var.get('value'):
            missing.append(name)
    if missing:
        raise ValueError('Missing secrets in .env: ' + ', '.join(missing))
    return result


def release(source, env_file):
    source = source.resolve()
    if source.suffix != '.yml' or source.stem.endswith('-release'):
        raise ValueError('Choose a versioned .yml source, not a release file')
    source.relative_to(ROOT / 'dsl')
    target = source.with_name(source.stem + '-release.yml')
    relative = str(target.relative_to(ROOT))
    tracked = subprocess.run(['git', 'ls-files', '--error-unmatch', '--', relative], cwd=ROOT, capture_output=True)
    ignored = subprocess.run(['git', 'check-ignore', '-q', '--', relative], cwd=ROOT, capture_output=True)
    if tracked.returncode == 0 or ignored.returncode != 0:
        raise ValueError('Release destination must be untracked and ignored by Git')
    if not env_file.is_file():
        raise ValueError('Local .env file not found')
    doc = yaml.safe_load(source.read_text())
    doc = populate(doc, dotenv_values(env_file, interpolate=False))
    # Build before writing so missing secrets never leave a partial import file.
    payload = yaml.safe_dump(doc, allow_unicode=True, sort_keys=False, width=110)
    fd, temporary = tempfile.mkstemp(prefix='.' + target.name + '.', suffix='-release.yml', dir=target.parent)
    try:
        with os.fdopen(fd, 'w') as file:
            file.write(payload)
        os.replace(temporary, target)  # mkstemp permissions: owner read/write only
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files', nargs='+', type=Path)
    parser.add_argument('--env', type=Path, default=ROOT / '.env')
    args = parser.parse_args()
    failed = False
    for source in args.files:
        try:
            print(release(source, args.env))
        except ValueError as exc:
            print(f'{source.name}: {exc}')
            failed = True
        except Exception:
            # YAML/parser errors can contain source values: never print them.
            print(f'{source.name}: release could not be built; check file format and permissions')
            failed = True
    return int(failed)


if __name__ == '__main__':
    raise SystemExit(main())
