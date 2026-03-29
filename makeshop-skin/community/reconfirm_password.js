// 상단 타이틀 변경
changeNaviTitleText('비밀번호 재확인');

// input class 추가
const textInput = document.querySelectorAll('.form-group input');
textInput.forEach(textfield => {
  textfield.classList.add('cw-textfield');
});