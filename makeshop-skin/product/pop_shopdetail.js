// swiper
const product_item = new CowaveSwiper('.product-item-wrapper .cowave-swiper', {
    loop: true,
    pagination: {
        el: '.cowave-swiper-pagination-custom',
        type: 'fraction',
    }
});

// 상단으로 이동 버튼
const topBtn = document.querySelector(".fixed-top");
const popup = document.getElementById("product-popup");

topBtn.addEventListener("click", function(e) {
    e.preventDefault();
    if(popup) {
        popup.scrollIntoView({ behavior: "smooth" });
    }
});

// 팝업 닫기
function close_this_popup() {
    const popup = document.getElementById("product-popup");

    if(popup) {
        popup.classList.remove("active");
    }

    if(window.opener) {
        self.close();
    } else {
        history.back();
    }
}