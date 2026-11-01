from pathlib import Path
from html import escape
import shutil,zipfile,json,hashlib,math
root=Path(__file__).resolve().parent.parent
workspace=root.parent
assets=root/'assets/overview'
assets.mkdir(parents=True,exist_ok=True)
downloads=root/'downloads'
downloads.mkdir(exist_ok=True)
source=workspace/'实体小样实施包_20261031'
files={
    'assembly.png':workspace/'型号标注三维_20261031/质量检查/01-Arduino布置与接线.png',
    'flat-top-section.svg':source/'04_平顶承压剖面.svg',
}
manifest={}
for name,p in files.items():
    shutil.copyfile(p,assets/name)
    manifest[name]={'source':str(p.relative_to(workspace)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'kind':'existing project digital drawing, not photograph of a built device'}
shapes=[]
def path(d,color='#116970',width=2):shapes.append(f'<path d="{d}" stroke="{color}" stroke-width="{width}" fill="none"/>')
def circle(x,y,r,fill,stroke=None):shapes.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="2"' if stroke else '')+'/>')
def text(x,y,t,size=20):shapes.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}" fill="#182832">{escape(t)}</text>')
for rx,ry in [(26,10),(51,20),(77,30)]:shapes.append(f'<ellipse cx="110" cy="166" rx="{rx}" ry="{ry}" stroke="#116970" stroke-width="2" fill="none"/>')
path('M110 77 C91 104 90 118 110 118 C130 118 129 104 110 77Z')
for row in range(6):
    for col in range(7):
        x=277+col*20;y=125+row*17-24*math.sin(math.hypot(col-3,row-2.5)*1.5)*math.exp(-math.hypot(col-3,row-2.5)*.3)
        path(f'M{x} {125+row*17} V{y:.2f}', '#b7c6ce',1)
        circle(x,y,3.7,'#344b59')
for i in range(8):
    a=2*math.pi*i/8;x=597+70*math.cos(a);y=165+70*math.sin(a)
    path(f'M597 165 L{x:.2f} {y:.2f}','#b7c6ce',5)
    circle(x,y,10,'#fff','#852657')
circle(597,165,22,'#263eae')
path('M212 165 H242 M234 159 L242 165 L234 171','#475d6b')
path('M452 165 H482 M474 159 L482 165 L474 171','#475d6b')
text(110,277,'一次扰动');text(339,277,'许多颗粒');text(597,277,'简单规则')
text(360,325,'从运动概念，到可试验的控制系统',18)
svg='<svg xmlns="http://www.w3.org/2000/svg" width="720" height="360" viewBox="0 0 720 360" role="img" aria-labelledby="title"><title id="title">从水波纹、颗粒起伏到中央与八路端部线圈</title><rect width="720" height="360" fill="#fff"/><g font-family="Microsoft YaHei,Arial,sans-serif">'+''.join(shapes)+'</g></svg>'
(assets/'concept.svg').write_text(svg,encoding='utf-8')
manifest['concept.svg']={'kind':'authored exact SVG geometry','purpose':'illustrative concept lineage, not a scientific simulation'}
csv=(source/'01_材料清单.csv').read_text(encoding='utf-8-sig')
(downloads/'materials.csv').write_text(csv,encoding='utf-8-sig')
names=['README_实体实施.md','01_材料清单.csv','02_接线与驱动设置.md','02_逐线接线表.csv','02_接线总图.svg','02_接线总图.png','03_单路驱动详图.svg','03_单路驱动详图.png','03_结构与试验参数.md','04_平顶承压剖面.svg','04_平顶承压剖面.png','04_上电标定与验收.md','05_资料来源.md','试制参数与计算.json']
with zipfile.ZipFile(downloads/'capital-prototype.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in names:z.write(source/name,name)
    for p in (source/'CapitalPrototype').glob('*'):
        if p.suffix in ['.ino','.h']:z.write(p,'CapitalPrototype/'+p.name)
report=workspace/'首页汇总_20261101'
report.mkdir(exist_ok=True)
(report/'图像来源.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared existing drawing assets, authored concept SVG, BOM and public prototype package (17 files).')
