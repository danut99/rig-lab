const { creatures } = await fetch('legends/manifest.json').then(response => response.json());
const gallery = document.querySelector('#gallery');
const dialog = document.querySelector('#detail');
for (const creature of creatures) {
  const card = document.createElement('button');
  card.className = 'card';
  card.style.setProperty('--accent', creature.color);
  card.innerHTML = `<div class="world">${creature.world} · Boss legendar</div><div class="image"><img src="${creature.image}" alt="${creature.name}" loading="eager"></div><h2>${creature.name}</h2><p class="title">${creature.title}</p><footer><span>${creature.status==='animated'?`${creature.bones} OASE · 4 ANIMAȚII`:'ADULT · ARTĂ DE CONCEPT'}</span><span>EXPLOREAZĂ ↗</span></footer>`;
  card.onclick = () => {
    document.querySelector('#detail-world').textContent = `${creature.world} · Boss legendar`;
    document.querySelector('#detail-name').textContent = creature.name;
    document.querySelector('#detail-title').textContent = creature.title;
    document.querySelector('#detail-image').src = creature.image;
    document.querySelector('#detail-image').alt = creature.name;
    document.querySelector('#detail-anatomy').textContent = creature.anatomy;
    document.querySelector('#download').href = creature.image;
    document.querySelector('#rig-link').href = creature.studio || `/?species=${creature.id}`;
    document.querySelector('#rig-link').hidden = creature.status !== 'animated';
    dialog.showModal();
  };
  gallery.append(card);
}
document.querySelector('#close').onclick = () => dialog.close();
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
