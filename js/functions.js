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

function menuOpen() {
  var x = document.getElementById("myMenu");
  var y = document.getElementsByClassName("topbar")[0];
  var z1 = document.getElementsByClassName("cls-1")[0];
  var z2 = document.getElementsByClassName("cls-1")[1];
  var z3 = document.getElementsByClassName("cls-1")[2];
  var z4 = document.getElementsByClassName("cls-2")[0];
    var z5 = document.getElementById("cut-off-top-rect");
    var z6 = document.getElementById("cut-off-bottom-rect");



    var l1 = document.getElementsByClassName("toplogo")[0];

    var l2 = document.getElementsByClassName("bottomlogo")[0];

    var l3 = document.getElementsByClassName("logobackground1")[0];;

    var l4 = document.getElementsByClassName("logobackground2")[0];;

  if (x.style.display === "block") {

      $("#cut-off-top-rect").css({
        transform: 'translate(0px,0px)'
    });
      $("#cut-off-bottom-rect").css({
        transform: 'translate(0px,0px)'
    });
    x.style.display = "none";
      y.style.background = "linear-gradient(0deg, rgba(242,241,240,0) 0%, rgba(242,241,240,1) 18%, rgba(242,241,240,1) 100%)";
      z1.className.baseVal = "cls-1";
      z2.className.baseVal = "cls-1";
      z3.className.baseVal = "cls-1";
      z4.className.baseVal = "cls-2";

      l1.className.baseVal = "logoblack";
      l2.className.baseVal = "logoblack";
      l3.className.baseVal = "logoblack";
      l4.className.baseVal = "logoblack";


  } else {

      $("#cut-off-top-rect").css({
        transform: 'translate(0px,-800px)'
    });
      $("#cut-off-bottom-rect").css({
        transform: 'translate(0px,-800px)'
    });
    x.style.display = "block";

    y.style.background = "#141414";
      z1.className.baseVal = "cls-3";
      z2.className.baseVal = "cls-3";
      z3.className.baseVal = "cls-3";
      z4.className.baseVal = "cls-4";

      l1.className.baseVal = "logowhite";

      l2.className.baseVal = "logowhite";

      l3.className.baseVal = "logowhite";

      l4.className.baseVal = "logowhite";
  }

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


  let slowscrollamount = Math.floor(scrollamount*15/2 % 700);

  topsvg.style.transform = "translate(0px,-" + String(slowscrollamount) + "px)"
  bottomsvg.style.transform = "translate(0px," + String(700-slowscrollamount) + "px)"
  halfpace = 1-Math.abs(2*(slowscrollamount/700-.5))
  logobackground.style.transform = "translate(0px," + String(-700 - (200*halfpace)) + "px)"
  logobackground2.style.transform = "translate(0px," + String(700 + (200*halfpace)) + "px)"


}
