    $('.list', '#pr-header').on('click', function(e) {
        e.preventDefault();
        $(this).siblings('.menu').toggle();
    });