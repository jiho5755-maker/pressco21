// 상단 타이틀 변경
changeNaviTitleText('적립금 내역');

// 입력폼 class 추가
const dateInput = document.querySelectorAll('.cw-date input');
dateInput.forEach(textfield => {
  textfield.classList.add('cw-textfield','sm');
});

document.querySelectorAll('.text-end').forEach(item => {
    const status = item.querySelector('.status');
    const value = item.querySelector('.value');

    if (status.textContent.trim() === "적립") {
        status.innerHTML = `<em class="cw-point-color">${status.textContent.trim()}</em>`;
        value.innerHTML = `<em class="cw-point-color">${value.textContent.trim()}</em>`;
    }
});