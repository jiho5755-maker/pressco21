$(function(){
    var recmdSwiper = new mySwiper('.recmd-swiper', {
        slidesPerView: 2,
        slidesPerGroup: 1,
        spaceBetween: 10,
        loop: false,
        pagination: {
            el: ".recmd-swiper .swiper-pagination",
            clickable: true,
        },
        grid: {
            rows: 2,
        },
        breakpoints: {
            1024: {
                slidesPerView: 4,
                grid: {
                    rows: 1,
                },
            },
            768: {
                slidesPerView: 3,
                grid: {
                    rows: 1,
                },
            }
        }
    });

    var bestSwiper = new mySwiper('.best-swiper', {
        slidesPerView: 2,
        slidesPerGroup: 1,
        spaceBetween: 10,
        loop: false,
        pagination: {
            el: ".best-swiper .swiper-pagination",
            clickable: true,
        },
        grid: {
            rows: 2,
        },
        breakpoints: {
            768: {
                grid: {
                    rows: 1,
                },
            }
        }
    });

    if ($('#topbanner').length > 0) {
        $('.header-menu').css('top', '40px');
    }

    if ($('.MK_product_list .title').length === 0) {
        $('.list_array').css('border-top', '0');
    }

});
