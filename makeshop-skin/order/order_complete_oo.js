// 모바일 상단
$('.navi-title span').text('주문 완료');
$('.navi-btns .basket').hide();

// arrow
$(".product_info .title").click(function() {
    $(this).siblings('.cont').toggle();
    $(this).find('.toggle-arrow').toggleClass('active');
});

// 주문상품 정보
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll(".basket-option-dlist li").forEach(li => {
    const img = li.querySelector("img");
    if (!img) return;

    if (li.querySelector(".text-wrap")) return;

    const nodes = [];
    let node = img.nextSibling;
    while (node) {
      const next = node.nextSibling;
      nodes.push(node);
      node = next;
    }

    const p = document.createElement("p");
    p.className = "text-wrap";

    nodes.forEach(n => p.appendChild(n));

    li.appendChild(p);
  });
});

// input width 자동 조정
function adjustInputWidth(input) {
  if (!input) return;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  // input의 현재 폰트 적용 (가능한 한 정확히)
  const style = window.getComputedStyle(input);
  const font = [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontSize + "/" + style.lineHeight,
    style.fontFamily
  ].join(" ");
  context.font = font;

  // 텍스트 폭 계산 (값이 없으면 placeholder 기준)
  const text = input.value || input.placeholder || "";
  const textWidth = context.measureText(text).width;

  // 패딩 + 여유값 추가
  const padding =
    parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
  input.style.width = Math.ceil(textWidth + padding + 10) + "px";
}

// 주어진 input에 자동조정 바인딩
function bindAutoWidth(input) {
  if (!input) return;
  adjustInputWidth(input);

  // 사용자 입력/변경 시
  input.addEventListener("input", () => adjustInputWidth(input));
  input.addEventListener("change", () => adjustInputWidth(input));

  // 폰트/레이아웃 변화 대비 (리사이즈 시 재계산)
  window.addEventListener("resize", () => adjustInputWidth(input));
}

// 대상 inputs: user_qty + view_point
document.addEventListener("DOMContentLoaded", function () {
  ["#user_qty", "#view_point"]
    .map(sel => document.querySelector(sel))
    .forEach(bindAutoWidth);
});

function setAndResize(input, value) {
  if (!input) return;
  input.value = value;
  adjustInputWidth(input);
}