function getProductTitle() {
  return (
    document.querySelector("#productTitle")?.innerText ||
    document.querySelector("h1")?.innerText ||
    document.title
  );
}

function createCard(title) {
  // remove old card if it exists
  const old = document.getElementById("carbon-cart-card");
  if (old) old.remove();

  const card = document.createElement("div");
  card.id = "carbon-cart-card";

  card.innerHTML = `
    <div class="cc-header">🌱 CarbonCart</div>
    <div class="cc-title">${title}</div>
    <div class="cc-estimate">8–18 kg CO₂e</div>
    <div class="cc-label">Estimated product footprint</div>
    <div class="cc-tip">
      Try recycled materials, secondhand options, or slower shipping.
    </div>
  `;

  document.body.appendChild(card);
}

// wait for page to load
setTimeout(() => {
  const title = getProductTitle();
  console.log("CarbonCart detected title:", title);

  createCard(title);
}, 1500);