let selectedCharacter = null;

async function initArchive() {
  const archiveDiv = document.getElementById("archive");
  const tagList = document.getElementById("tag-list");
  const searchBox = document.getElementById("search-box");

  const data = await fetch("data.json").then(res => res.json()).catch(err => {
    console.error("❌ data.json 読み込み失敗:", err);
    return [];
  });

  const verify = await fetch("https://patreon-archive-site.fakebird279.workers.dev/verify", {
    credentials: "include"
  }).then(res => res.json());

  const roles = verify.roles || [];
  const cutoff = verify.cutoffDate || "00000000";

  const isStandard = roles.includes("1350114379391045692");
  const isSpecial  = roles.includes("1350114736242557010");
  const isPremium  = roles.includes("1350114869780680734");
  const isOwner    = roles.includes("1350114997040316458");

  data.sort((a, b) => b.date.localeCompare(a.date));

  const tree = {};
  data.forEach(item => {
    const { type, series, character } = item.category;
    if (!tree[type]) tree[type] = {};
    if (!tree[type][series]) tree[type][series] = [];
    if (!tree[type][series].includes(character)) {
      tree[type][series].push(character);
    }
  });

  for (const type in tree) {
    const typeDiv = document.createElement("div");
    const typeToggle = document.createElement("div");
    typeToggle.textContent = `▶ ${type}`;
    typeToggle.style.cursor = "pointer";
    typeToggle.style.fontWeight = "bold";
    typeToggle.style.margin = "0.5rem 0";

    const seriesDiv = document.createElement("div");
    seriesDiv.style.display = "none";
    seriesDiv.style.marginLeft = "1rem";

    typeToggle.addEventListener("click", () => {
      const open = seriesDiv.style.display === "block";
      seriesDiv.style.display = open ? "none" : "block";
      typeToggle.textContent = `${open ? "▶" : "▼"} ${type}`;
    });

    typeDiv.appendChild(typeToggle);
    typeDiv.appendChild(seriesDiv);
    tagList.appendChild(typeDiv);

    for (const series in tree[type]) {
      const seriesToggle = document.createElement("div");
      seriesToggle.textContent = `▶ ${series}`;
      seriesToggle.style.cursor = "pointer";
      seriesToggle.style.marginLeft = "0.5rem";

      const charList = document.createElement("div");
      charList.style.display = "none";
      charList.style.marginLeft = "1.5rem";

      seriesToggle.addEventListener("click", () => {
        const open = charList.style.display === "block";
        charList.style.display = open ? "none" : "block";
        seriesToggle.textContent = `${open ? "▶" : "▼"} ${series}`;
      });

      tree[type][series].forEach(character => {
        const btn = document.createElement("div");
        btn.textContent = `👤 ${character}`;
        btn.style.cursor = "pointer";
        btn.style.margin = "0.2rem 0";
        btn.addEventListener("click", () => {
          selectedCharacter = character;
          render();
        });
        charList.appendChild(btn);
      });

      seriesDiv.appendChild(seriesToggle);
      seriesDiv.appendChild(charList);
    }
  }

  function render() {
    archiveDiv.innerHTML = "";
    const keyword = searchBox.value.trim().toLowerCase();

    const filtered = data.filter(item => {
      const matchChar = selectedCharacter ? item.category.character === selectedCharacter : true;
      const matchKeyword =
        keyword === "" ||
        item.title.toLowerCase().includes(keyword) ||
        item.category.character.toLowerCase().includes(keyword) ||
        item.category.series.toLowerCase().includes(keyword) ||
        item.tags.some(tag => tag.toLowerCase().includes(keyword));
      return matchChar && matchKeyword;
    });

    if (filtered.length === 0) {
      archiveDiv.innerHTML = "<p>該当する作品が見つかりませんでした。</p>";
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";

      let zipSection = "";

      if (isStandard) {
        zipSection = `<div style="color: gray;">SpecialまたはPremiumにアップグレードすると閲覧可能です</div>`;
      } else if (isSpecial) {
        if (item.date >= cutoff) {
          zipSection = `<a href="${item.url}" target="_blank">▶ アーカイブを見る</a>`;
        } else {
          zipSection = `<div style="color: gray;">Premiumにアップグレードすると閲覧可能です</div>`;
        }
      } else if (isPremium || isOwner) {
        zipSection = `<a href="${item.url}" target="_blank">▶ アーカイブを見る</a>`;
      }

      div.innerHTML = `
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
          <img src="${item.thumbnail}" alt="thumb" style="width: 120px; object-fit: cover; border: 1px solid #ccc;" />
          <div>
            <strong>${item.title}</strong><br>
            <small>${item.date}</small><br>
            ${zipSection}
          </div>
        </div>
      `;
      archiveDiv.appendChild(div);
    });
  }

  render();
  searchBox.addEventListener("input", render);

  document.getElementById("hamburger").addEventListener("click", () => {
    document.querySelector("aside").classList.toggle("open");
  });
}
