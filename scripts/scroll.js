$(document).ready(function() {

	$(window).scroll(function () {
		if ($(window).scrollTop() > 115) {
			$('#bar').addClass('navbar-fixed');
			$('div.pagetext').css('margin-top', '70px');
		}
		if ($(window).scrollTop() <= 115) {
			$('#bar').removeClass('navbar-fixed');
			$('div.pagetext').css('margin-top', '0px');
		}
	});
});