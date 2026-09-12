import tempfile
import unittest
from pathlib import Path
import pymupdf as fitz
from pdf_worker import render, split

class PdfTasksTest(unittest.TestCase):
    def test_roundtrip_unicode_prices_and_order(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            items = [dict(name=f'Karađorđeva шницла {i}', description='Традиционално јело & <sauce>', price=1200+i, currency='RSD', portion='250 g', category='Главна јела') for i in range(78)]
            render(dict(name='Мени · Kafana', items=items, url='https://example.com/menu/kafana'), out)
            with fitz.open(out / 'menu.pdf') as doc:
                text = ''.join(p.get_text() for p in doc)
                self.assertIn('Karađorđeva', text)
                self.assertIn('шницла', text)
                self.assertIn('1277 RSD', text)
                self.assertIn('<sauce>', text)
                self.assertGreater(len(doc), 1)
                count = len(doc)
            self.assertTrue((out / 'preview.png').exists())
            self.assertEqual(split(out / 'menu.pdf', out, 100), [f'page-{i+1:03}.png' for i in range(count)])
            with self.assertRaises(ValueError): split(out / 'menu.pdf', out, 1)

    def test_encrypted_pdf(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            doc = fitz.open(); doc.new_page()
            doc.save(out / 'locked.pdf', encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw='owner', user_pw='secret')
            with self.assertRaisesRegex(ValueError, 'Password-protected'): split(out / 'locked.pdf', out)

    def test_missing_currency_is_not_invented(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            render(dict(name='Menu', items=[dict(name='Dish', description=None, price=None, currency=None, portion=None, category='Main')]), out)
            with fitz.open(out / 'menu.pdf') as doc:
                self.assertNotIn('RSD', doc[0].get_text())

if __name__ == '__main__': unittest.main()
