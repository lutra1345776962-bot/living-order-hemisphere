from pathlib import Path
R=Path(__file__).resolve().parent.parent
S=R/'src/breadboard-wiring'
html=(S/'page.template.html').read_text(encoding='utf-8')
for marker,name in [('/*DATA*/','data.js'),('/*APP*/','app.js')]:
    assert html.count(marker)==1
    html=html.replace(marker,(S/name).read_text(encoding='utf-8'))
(R/'breadboard-wiring.html').write_text(html,encoding='utf-8')
print('Built breadboard-wiring.html')
