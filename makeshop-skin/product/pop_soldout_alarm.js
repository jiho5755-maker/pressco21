// 옵션 선택시 active 클래스 추가
document.querySelectorAll('.MS_HybridOptItem').forEach(function(option) {
    option.addEventListener('click', function(e) {
        if (this.querySelector('input[name="hy_option[]"]') != null) {
            this.querySelector('input[name="hy_option[]"]').click();
        }
    });
});