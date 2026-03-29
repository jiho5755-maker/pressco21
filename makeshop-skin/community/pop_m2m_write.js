// 상단 타이틀 변경
changeNaviTitleText('1:1 게시판');

// 파일첨부 버튼 class 추가
document.addEventListener('DOMContentLoaded', function () {
    const fileButton = document.querySelector('.MS_input_file_button');
    if (fileButton) {
        fileButton.classList.add('btn', 'btn-gray');
    }
});
