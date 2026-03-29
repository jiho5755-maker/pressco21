// 상단 타이틀 변경
changeNaviTitleText('회원가입');

// 공백 제거
const formContents = document.querySelectorAll('.form-content');

formContents.forEach(formContent => {
  formContent.innerHTML = formContent.innerHTML.replace(/&#160;/g, '');
});

// 약관 펼침 기능 및 전체 체크 기능
document.addEventListener("DOMContentLoaded", function () {
    const formWraps = document.querySelectorAll('.form-wrap');

    formWraps.forEach(formWrap => {
        const formCheck = formWrap.querySelector('.form-check');
        const termsContent = formWrap.querySelector('.terms-content');

        formCheck.addEventListener('click', function (e) {
            if (e.target === formCheck) {
                termsContent.classList.toggle('active');
            }
            if (termsContent.classList.contains('active')) {
                formCheck.classList.toggle('active');
            } else {
                formCheck.classList.remove('active');
            }
        });
    });
});