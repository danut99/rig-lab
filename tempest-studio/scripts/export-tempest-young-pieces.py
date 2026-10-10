"""Pack exact rig layers; positions reconstruct the generated art without refitting."""
from pathlib import Path
from PIL import Image
import json

root=Path(__file__).resolve().parent.parent
for age in ['pui','juvenil']:
 model=root/'public/models'/('tempestopteryx-'+age)
 target=root.parent/'generated-dinosaurs/tempestopteryx'/age
 records=[]
 for name in ['farWing','nearWing','body']:
  image=Image.open(model/(name+'.png'))
  box=image.getbbox()
  records.append((name,image.crop(box),box))
 padding=24
 width=max(image.width for _,image,_ in records)+padding*2
 height=sum(image.height for _,image,_ in records)+padding*(len(records)+1)
 sheet=Image.new('RGBA',(width,height))
 y=padding
 regions=[]
 for name,image,box in records:
  sheet.paste(image,(padding,y))
  regions.append({'name':name,'atlasRect':[padding,y,image.width,image.height],
                  'sourceRect':list(box),'sourcePlacement':[box[0],box[1]],
                  'runtimeTexture':name+'.png'})
  y+=image.height+padding
 sheet.save(target/'parts-v2.png')
 layout=json.loads((model/'layout.json').read_text())
 metadata={'species':'tempestopteryx','stage':age,'art':'art.png','parts':'parts-v2.png',
           'sourceSize':[layout['width'],layout['height']],
           'origin':[900,660 if age=='pui' else 650],
           'coordinates':'worldX=pixelX-origin[0]; worldY=origin[1]-pixelY',
           'regions':regions,'bones':layout['bones'],
           'notes':'Exact source pixels; use sourcePlacement to assemble, not approximate bone endpoints.'}
 (target/'assembly-v2.json').write_text(json.dumps(metadata,indent=2)+'\n')
 (target/'skeleton-v2.json').write_bytes((model/'bones.json').read_bytes())
 # Every visible source pixel is retained at its original position.
 rebuilt=Image.new('RGBA',tuple(metadata['sourceSize']))
 for name,image,box in records:
  # Layers do not overlap. Exact copy avoids alpha compositing rounding.
  original=Image.open(model/(name+'.png'))
  for_y=original.getbbox()
  cropped=original.crop(for_y)
  patch=Image.new('RGBA',rebuilt.size)
  patch.paste(cropped,(for_y[0],for_y[1]))
  import numpy as np
  a=np.array(rebuilt);b=np.array(patch);mask=b[:,:,3]>0;a[mask]=b[mask]
  rebuilt=Image.fromarray(a)
 a=np.array(rebuilt);b=np.array(Image.open(target/'art.png'))
 assert np.array_equal(a[b[:,:,3]>0],b[b[:,:,3]>0]),'Assembly changed source artwork'
 print(age, len(layout['bones']),'bones; exact assembled source pixels; packed pieces',sheet.size)

catalog_path=root.parent/'generated-dinosaurs/manifest.json'
catalog=json.loads(catalog_path.read_text(encoding='utf8'))
species=next(s for s in catalog['species'] if s['id']=='tempestopteryx')
for stage in species['stages']:
 if stage['id']=='adult':continue
 prefix='tempestopteryx/'+stage['id']+'/'
 stage.update(art=prefix+'art.png',parts=prefix+'parts-v2.png',assembly=prefix+'assembly-v2.json',skeleton=prefix+'skeleton-v2.json')
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
