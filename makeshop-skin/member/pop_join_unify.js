// 회원가입 입력폼
document.addEventListener("DOMContentLoaded", function () {
    const titBoxes = document.querySelectorAll('.tit-box');

    titBoxes.forEach(titBox => {
        titBox.addEventListener('click', function () {
            const formBox = titBox.nextElementSibling;
            if (formBox && formBox.classList.contains('join-form')) {
                formBox.style.display = formBox.style.display === 'none' ? 'block' : 'none';
            }
            titBox.classList.toggle('active');
        });
    });
});

// 공백 제거
const formContents = document.querySelectorAll('.form-content');

formContents.forEach(formContent => {
  formContent.innerHTML = formContent.innerHTML.replace(/&nbsp;/g, '');
});


/* 14세 이상 필수
const userAge = document.querySelector('.user_age_wrap input');
userAge.classList.add('form-check-input');
*/