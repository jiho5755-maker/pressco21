/* =============================================
 * YouTube "Learn & Shop" 섹션 JS
 * 메이크샵 메인페이지 JS 편집기용
 * GAS 프록시로 유튜브 채널 최신 영상 자동 로드
 * ============================================= */
(function() {
    'use strict';

    var GOOGLE_SCRIPT_URL =
        'https://script.google.com/macros/s/AKfycbxNQxgd8Ew0oClPSIoSA3vbtbf4LoOyHL6j7J1cXSyI1gmaL3ya6teTwmu883js4zSkwg/exec';

    function loadYouTube() {
        var featuredArea = document.getElementById('featured-video-area');
        var CACHE_KEY = 'yt_cache_v3';
        var CACHE_TIME = 'yt_time_v3';
        var CACHE_DURATION = 24 * 60 * 60 * 1000;
        try {
            var cached = localStorage.getItem(CACHE_KEY);
            var time = localStorage.getItem(CACHE_TIME);
            if (cached && time && Date.now() - parseInt(time) < CACHE_DURATION) {
                renderYouTube(JSON.parse(cached));
                return;
            }
        } catch (e) {}
        $.ajax({
            url: GOOGLE_SCRIPT_URL + '?count=5&t=' + Date.now(),
            dataType: 'json',
            cache: false,
            timeout: 10000,
            success: function (data) {
                if (data.status === 'success' && data.items) {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(data.items));
                    localStorage.setItem(CACHE_TIME, Date.now().toString());
                    renderYouTube(data.items);
                } else {
                    featuredArea.innerHTML =
                        '<p style="padding:30px;text-align:center;color:#888">영상을 불러올 수 없습니다.</p>';
                }
            },
            error: function () {
                featuredArea.innerHTML =
                    '<p style="padding:30px;text-align:center;color:#888">영상을 불러올 수 없습니다.</p>';
            },
        });
    }

    function renderYouTube(videos) {
        var featuredArea = document.getElementById('featured-video-area');
        var sliderWrapper = document.getElementById('youtube-slider-wrapper');
        if (!videos || videos.length === 0) return;
        var featured = videos[0];
        featuredArea.innerHTML =
            '<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/' +
            featured.id +
            '?rel=0&modestbranding=1" frameborder="0" allowfullscreen></iframe></div><div class="featured-video-info"><h4>' +
            featured.title +
            '</h4><div class="video-meta">' +
            new Date(featured.publishedAt).toLocaleDateString() +
            '</div></div>';
        for (var i = 1; i < videos.length; i++) {
            var v = videos[i];
            var thumb = 'https://img.youtube.com/vi/' + v.id + '/mqdefault.jpg';
            sliderWrapper.innerHTML +=
                '<div class="swiper-slide" onclick="playVideo(\'' +
                v.id +
                '\')"><div class="video-thumb"><img src="' +
                thumb +
                '" alt=""><div class="play-icon"></div></div><div class="slide-info"><h6>' +
                v.title +
                '</h6><span class="date">' +
                new Date(v.publishedAt).toLocaleDateString() +
                '</span></div></div>';
        }
        new Swiper('.youtube-slider', {
            slidesPerView: 1.1,
            spaceBetween: 10,
            loop: false,
            pagination: { el: '.youtube-slider .swiper-pagination', clickable: true },
            navigation: {
                nextEl: '.youtube-slider-wrap .swiper-button-next',
                prevEl: '.youtube-slider-wrap .swiper-button-prev',
            },
            breakpoints: { 768: { slidesPerView: 4, spaceBetween: 15, loop: false } },
        });
    }

    window.playVideo = function(videoId) {
        var wrapper = document.querySelector('.featured-video-wrap .video-wrapper');
        if (wrapper) {
            wrapper.innerHTML =
                '<iframe src="https://www.youtube.com/embed/' +
                videoId +
                '?rel=0&autoplay=1" frameborder="0" allowfullscreen></iframe>';
            document
                .querySelector('.youtube-section-v3')
                .scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    window.toggleProducts = function() {
        var wrap = document.getElementById('related-products-wrap');
        if (!wrap) return;
        if (window.innerWidth >= 768) return;
        if (wrap.classList.contains('collapsed')) {
            wrap.classList.remove('collapsed');
            wrap.classList.add('expanded');
        } else {
            wrap.classList.remove('expanded');
            wrap.classList.add('collapsed');
        }
    };

    $(function() {
        loadYouTube();
    });
})();
