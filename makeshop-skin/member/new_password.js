// 상단 타이틀 변경
changeNaviTitleText('아이디/비밀번호 찾기');


// 탭 메뉴
const tabs = document.querySelectorAll('.cw-tab li');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach((tab) => {
    tab.addEventListener('click', (event) => {
        event.preventDefault();
        
        tabs.forEach((t) => t.classList.remove('now'));
        tab.classList.add('now');

        contents.forEach((content) => content.classList.remove('active'));

        const targetId = tab.querySelector('a').getAttribute('href');
        const targetContent = document.querySelector(targetId);

        if (targetContent) targetContent.classList.add('active');
    });
});
