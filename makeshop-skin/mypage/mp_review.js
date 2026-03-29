$(document).ready(function(){
    
    $('#contWrap #review1Wrap').hide();
    $('#contWrap #review2Wrap').hide();
    $('#contWrap #review1Wrap').show();
    $('#tabWrap ul li:first').addClass('now');

    $('#tabWrap ul li a').click(function(){ 
        $('#tabWrap ul li').removeClass('now');
        $(this).parent().addClass('now'); 
        var currentTab = $(this).attr('href'); 
        $('#contWrap #review1Wrap').hide();
        $('#contWrap #review2Wrap').hide();
        $(currentTab).show();
        return false;
    });
});