"""Export exact source pieces and assembly schema for completed younger rigs."""
from pathlib import Path
from PIL import Image
import json,sys,numpy as np
root=Path(__file__).resolve().parent.parent
configs=json.loads((root/'source/remaining-young-configs.json').read_text())
catalogpath=root.parent/'generated-dinosaurs/manifest.json'
catalog=json.loads(catalogpath.read_text(encoding='utf8'))
for ident in sys.argv[1:] or configs:
 species,age=ident.rsplit('-',1);assert age in ('pui','juvenil')
 model=root/'public/models'/ident;target=root.parent/'generated-dinosaurs'/species/age
 layout=json.loads((model/'layout.json').read_text());rig=json.loads((model/'animated.json').read_text())
 records=[]
 for slot in rig['slots']:
  name=slot['name'];image=Image.open(model/(name+'.png'));box=image.getbbox()
  if box:records.append((name,image.crop(box),box))
 padding=24;width=max(im.width for _,im,_ in records)+2*padding
 height=sum(im.height for _,im,_ in records)+padding*(len(records)+1)
 sheet=Image.new('RGBA',(width,height));regions=[];y=padding
 rebuilt=np.zeros((layout['height'],layout['width'],4),dtype=np.uint8)
 for name,image,box in records:
  sheet.paste(image,(padding,y));regions.append({'name':name,'atlasRect':[padding,y,image.width,image.height],'sourceRect':list(box),'sourcePlacement':list(box[:2]),'runtimeTexture':name+'.png'})
  pixels=np.array(Image.open(model/(name+'.png')));mask=pixels[:,:,3]>0;rebuilt[mask]=pixels[mask];y+=image.height+padding
 original=np.array(Image.open(target/'art.png'));mask=original[:,:,3]>0
 assert np.array_equal(rebuilt[mask],original[mask]),ident+' assembly differs from original'
 assert np.array_equal(rebuilt[:,:,3]>0,mask),ident+' has extra pixels'
 sheet.save(target/'parts-v2.png')
 metadata={'species':species,'stage':age,'art':'art.png','parts':'parts-v2.png','sourceSize':[layout['width'],layout['height']],'origin':configs[ident]['origin'],'coordinates':'worldX=pixelX-origin[0]; worldY=origin[1]-pixelY','regions':regions,'bones':layout['bones'],'notes':'Exact artwork pixels. Assemble using sourcePlacement. Socket overlaps share one deform field.'}
 (target/'assembly-v2.json').write_text(json.dumps(metadata,indent=2)+'\n')
 (target/'skeleton-v2.json').write_bytes((model/'bones.json').read_bytes())
 entry=next(s for s in catalog['species'] if s['id']==species)
 stage=next(s for s in entry['stages'] if s['id']==age);prefix=species+'/'+age+'/'
 stage.update(art=prefix+'art.png',parts=prefix+'parts-v2.png',assembly=prefix+'assembly-v2.json',skeleton=prefix+'skeleton-v2.json')
 print(ident,len(layout['bones']),'bones;',len(records),'exact source pieces')
catalogpath.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
