//$( document ).ready(function()
$(function(){
    smoothScroll(300);
    workBelt1();
    workBelt2();
    workBelt3();
    workBelt4();
    workLoad();

});
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

function closeall(){
    $('.work-return').click();
}

function workBelt1() {
    $('.thumb-unit-1').click(function(){
    closeall()
	$('.work-belt-1').css('left','0%');
        $('.work-container-1').hide(800)
        $('.work-belt-1').css('left','-100%');
        $('.work-container-1').show();
    });


    $('.work-return-1').click(function(){
        $('.work-belt-1').css('left','0%');
        $('.work-container-1').hide(800);
    });


}
function workBelt2() {
    $('.thumb-unit-2').click(function(){
        closeall()
	$('.work-belt-2').css('left','0%');
        $('.work-container-2').hide(800)
        $('.work-belt-2').css('left','-100%');
        $('.work-container-2').show();
    });

    $('.work-return-2').click(function(){
        $('.work-belt-2').css('left','0%');
        $('.work-container-2').hide(800);
    });

}
function workBelt3() {
    $('.thumb-unit-3').click(function(){
        closeall()
	$('.work-belt-3').css('left','0%');
        $('.work-container-3').hide(800)
        $('.work-belt-3').css('left','-100%');
        $('.work-container-3').show();
    });

    $('.work-return-3').click(function(){
        $('.work-belt-3').css('left','0%');
        $('.work-container-3').hide(800);
    });

}
function workBelt4() {
    $('.thumb-unit-4').click(function(){
        closeall()
	$('.work-belt-4').css('left','0%');
        $('.work-container-4').hide(800)
        $('.work-belt-4').css('left','-100%');
        $('.work-container-4').show();
    });

    $('.work-return-4').click(function(){
        $('.work-belt-4').css('left','0%');
        $('.work-container-4').hide(800);
    });

}

function workLoad() {
    $.ajaxSetup({cache: true});
    $('.thumb-unit').click(function () {

        var $this = $(this),
            newTitle = $this.find('strong').text(),
            newFolder = $this.attr('id')
            spinner = '<div class="loader">Loading...</div>',
            newHTML = 'work/' + newFolder + '.html';

        $('.project-load').html(spinner).load(newHTML);
        $('.project-title').text(newTitle);
    });


}

window.addEventListener('scroll', function() {
  svgScroll(window.scrollY);
});

document.addEventListener("DOMContentLoaded", function() {
const topsvg = document.querySelector('.toplogo');
const bottomsvg = document.querySelector('.bottomlogo');
const logobackground = document.querySelector('.logobackground1');
const logobackground2 = document.querySelector('.logobackground2');
});

function svgScroll(scrollamount) {
    const topsvg = document.querySelector('.toplogo');
const bottomsvg = document.querySelector('.bottomlogo');
const logobackground = document.querySelector('.logobackground1');
const logobackground2 = document.querySelector('.logobackground2');


  let slowscrollamount = Math.floor(scrollamount*15 % 700);

  topsvg.style.transform = "translate(0px,-" + String(slowscrollamount) + "px)"
  bottomsvg.style.transform = "translate(0px," + String(700-slowscrollamount) + "px)"
  halfpace = 1-Math.abs(2*(slowscrollamount/700-.5))
  logobackground.style.transform = "translate(0px," + String(-700 - (200*halfpace)) + "px)"
  logobackground2.style.transform = "translate(0px," + String(700 + (200*halfpace)) + "px)"


}
