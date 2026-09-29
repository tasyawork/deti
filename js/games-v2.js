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
    window.PaintGame(game.querySelector(".game-view"), {
      assets: "../../assets/coloring/",
      isBlocked: () => false,
    });
  });
})();
