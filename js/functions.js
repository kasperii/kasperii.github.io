//$( document ).ready(function()
$(function(){
    smoothScroll(300);
});
  // Get started!
    function smoothScroll (duration) {
        $('a[href^="#"]').on('click', function(event) {
            //So it looks for href with # in . if click next function starts
            var target = $( $(this).attr('href') );
            //now it stores the name from the # as target
            if( target.length ) {
                //if its not empty
                event.preventDefault();
                //prevent acting like links usually acts like (following the hyperlink) like reloading the browser
                $('html, body').animate({
                    // go to target.offset which is the offset / id (to top? or from top?)
                    scrollTop: target.offset().top
                }, duration);
            }
        });
    }