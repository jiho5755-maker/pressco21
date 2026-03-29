// 상단 타이틀 변경
changeNaviTitleText('상품검색');

// 옵션보기
document.querySelectorAll('.prds--more .option-detail .opt-btn').forEach(btn => btn.onclick = () => btn.classList.toggle('on'));

// 일반 검색
const searchMenu = document.querySelector('.side-search-wrap');
const searchOpen = document.querySelector('.side-search-open');
const searchClose = document.querySelector('.side-search-close');
const searchOverlay = document.querySelector('.side-search-overlay');

const disableScroll = () => {
    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
};

const enableScroll = () => {
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
};

const opensearchMenu = () => {
    searchMenu?.classList.add('active');
    searchOverlay?.classList.add('active');
    disableScroll();
};

const closesearchMenu = () => {
    searchMenu?.classList.remove('active');
    searchOverlay?.classList.remove('active');
    enableScroll();
};

searchOpen?.addEventListener('click', opensearchMenu);
searchClose?.addEventListener('click', closesearchMenu);
searchOverlay?.addEventListener('click', closesearchMenu);

// 다찾다 검색 파인더
/*const sfinderMenu = document.querySelector('.side-sfinder-wrap');
const sfinderOpen = document.querySelector('.side-sfinder-open');
const sfinderClose = document.querySelector('.side-sfinder-close');
const sfinderOverlay = document.querySelector('.side-sfinder-overlay');

const sfinderScroll_off = () => {
    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
};

const sfinderScroll_on = () => {
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
};

const openfinderMenu = () => {
    sfinderMenu?.classList.add('active');
    sfinderOverlay?.classList.add('active');
    sfinderScroll_off();
};

const closefinderMenu = () => {
    sfinderMenu?.classList.remove('active');
    sfinderOverlay?.classList.remove('active');
    sfinderScroll_on();
};

sfinderOpen?.addEventListener('click', openfinderMenu);
sfinderClose?.addEventListener('click', closefinderMenu);
sfinderOverlay?.addEventListener('click', closefinderMenu);

const toggleOnClick = (selector) => {
    document.querySelectorAll(selector).forEach(el =>
        el?.addEventListener('click', () => el.classList.toggle('on'))
    );
};

toggleOnClick('.side-sfinder-wrap .finder-options');
toggleOnClick('.side-sfinder-wrap .option-title');*/