// 상단 타이틀 변경
changeNaviTitleText('적립금 내역');

// 입력폼 class 추가
const dateInput = document.querySelectorAll('.cw-date input');
dateInput.forEach(textfield => {
    textfield.classList.add('cw-textfield','sm');
});
