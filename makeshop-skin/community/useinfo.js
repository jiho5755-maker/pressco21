// 상단 타이틀 변경
changeNaviTitleText('이용안내');

var currentDomain = window.location.origin;

document.getElementById('popup-close').addEventListener('click', function() {
    // iframe 내에서 버튼을 클릭할 때, 부모 페이지로 메시지를 전송
    window.parent.postMessage('iframeButtonClicked', currentDomain);
});
