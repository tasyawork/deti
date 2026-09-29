(() => {
  const reels = document.getElementById("reels");
  const back = document.querySelector(".back");
  try {
    if (back && sessionStorage.getItem("kids-player-return")) {
      back.href = "../../index.html?return=player";
    }
  } catch (e) {}

  reels.querySelectorAll(".game").forEach((game) => {
    game.classList.add("is-inline");
    const view = game.querySelector(".game-view");
    if (game.dataset.game === "memory") {
      window.MemoryGame(view);
      return;
    }
    window.PaintGame(view, {
      assets: "../../assets/coloring/",
      isBlocked: () => false,
    });
  });
})();
