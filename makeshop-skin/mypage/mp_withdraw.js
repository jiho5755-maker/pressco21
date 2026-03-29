// 상단 타이틀 변경
changeNaviTitleText('회원탈퇴 신청');

// 직접 선택 시 textarea
document.addEventListener('DOMContentLoaded', function () {
    const group = document.getElementById('user-reason-group');
    const radios = document.querySelectorAll('input[name="userexit_withdraw_msg"]');

    group.style.display = 'none';

    radios.forEach(r => r.addEventListener('click', () => {
        group.style.display = document.getElementById('userexit_custom_msg').checked ? '' : 'none';
    }));
});