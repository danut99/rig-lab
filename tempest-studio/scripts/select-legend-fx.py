"""Extract existing animated dragon atlas regions, preserving rotation and trim offsets."""
import json, zipfile, re
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
from io import BytesIO
root=Path(__file__).resolve().parents[1]
library=root.parents[1]/'public/dragons/library'
choices=[('fire','incendiary_3','FX/blow-fire/blow-', 'Jet de foc'),('water','colossuseternal_3','fx/whirlwind/water_whirlwind','Vârtej acvatic'),('earth','colossuseternal_3','fx/impact_ground/impact_ground_', 'Undă de impact'),('ice','avalancheeternal_3','fx/explosion','Explozie glaciară'),('plant','ivyeternal_3','fx/eff_xplo','Explozie vegetală'),('storm','bicephalouseternal_3','fx/pink_blast','Detonare violetă')]
reports=[]
for element,slug,prefix,label in choices:
    archive=next(library.glob('*dragon_'+slug+'_HD*.zip'))
    with zipfile.ZipFile(archive) as z:
        atlas=z.read(next(n for n in z.namelist() if n.endswith('.atlas'))).decode('utf8')
        texture=Image.open(BytesIO(z.read(next(n for n in z.namelist() if n.endswith('.dds'))))).convert('RGBA')
    regions={};cur=None
    for line in atlas.splitlines():
        if line and not line.startswith(' ') and ':' not in line:
            cur=line;regions[cur]={}
        elif cur and ':' in line:
            key,value=line.strip().split(':',1);regions[cur][key]=value.strip()
    names=sorted([n for n in regions if n.startswith(prefix)],key=lambda n:int(re.findall(r'\d+',n)[-1]))
    frames=[]
    for name in names:
        region=regions[name];x,y=map(int,region['xy'].split(','));w,h=map(int,region['size'].split(','));ow,oh=map(int,region['orig'].split(','));ox,oy=map(int,region['offset'].split(','))
        rotated=region['rotate']=='true'
        piece=texture.crop((x,y,x+(h if rotated else w),y+(w if rotated else h)))
        if rotated:piece=piece.transpose(Image.Transpose.ROTATE_90)
        frame=Image.new('RGBA',(ow,oh));frame.paste(piece,(ox,oh-oy-h));frames.append(frame)
    assert frames, prefix
    width=max(f.width for f in frames);height=max(f.height for f in frames);edge=max(width,height)
    dest=root/'public/legend-fx';dest.mkdir(parents=True,exist_ok=True)
    cols=4;tile=256;rows=(len(frames)+cols-1)//cols;sheet=Image.new('RGBA',(cols*tile,rows*tile))
    for i,frame in enumerate(frames):
        canvas=Image.new('RGBA',(edge,edge));canvas.paste(frame,((edge-frame.width)//2,(edge-frame.height)//2));canvas=canvas.resize((tile,tile),Image.Resampling.LANCZOS)
        sheet.paste(canvas,((i%cols)*tile,(i//cols)*tile))
    if element=='earth':
        # Keep the imported impact frames and their alpha, tinting the blue magic to warm mineral dust.
        alpha=sheet.getchannel('A');luma=ImageEnhance.Brightness(ImageOps.grayscale(sheet)).enhance(1.35)
        sheet=ImageOps.colorize(luma,'#171005','#ffecad').convert('RGBA');sheet.putalpha(alpha)
    sheet.save(dest/(element+'.png'))
    report=dict(element=element,archive=archive.name,regions=names,label=label,frames=len(frames),columns=cols,tile=tile,width=width,height=height)
    reports.append(report);print(element,len(frames),width,height)
(root/'public/legend-fx/manifest.json').write_text(json.dumps(reports,indent=2,ensure_ascii=False),encoding='utf8')
