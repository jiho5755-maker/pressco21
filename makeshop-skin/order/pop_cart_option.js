document.querySelectorAll('.info-content .option-text, .info-content .option-check, .info-content .option-check-md').forEach(function(option) {
    option.addEventListener('click', function(e) {
        if (this.querySelector('input[name="hy_option[]"]') != null) {
            this.querySelector('input[name="hy_option[]"]').click();
        }
    });
});


