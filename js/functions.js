//$( document ).ready(function()
$(function(){
    smoothScroll(300);
    workBelt();
    workBelt2();
    workLoad();
    workLoad2();

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

function workBelt() {
    $('.thumb-unit').click(function(){
	$('.work-belt-2').css('left','0%');
        $('.work-container-2').hide(800)
        $('.work-belt').css('left','-100%');
        $('.work-container').show();
    });


    $('.work-return').click(function(){
        $('.work-belt').css('left','0%');
        $('.work-container').hide(800);
    });


}
function workBelt2() {
    $('.thumb-unit-2').click(function(){
	$('.work-belt').css('left','0%');
        $('.work-container').hide(800)
        $('.work-belt-2').css('left','-100%');
        $('.work-container-2').show();
    });

    $('.work-return-2').click(function(){
        $('.work-belt-2').css('left','0%');
        $('.work-container-2').hide(800);
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
function workLoad2() {
    $.ajaxSetup({cache: true});
    $('.thumb-unit-2').click(function () {

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
