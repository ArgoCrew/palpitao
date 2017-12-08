angular.module('palpite.megasena', [])
  .config(function($routeProvider, $httpProvider){ 
    $routeProvider.when('/palpites', {
      templateUrl: '/palpite/palpite.html',
      controller: 'PalpiteController',
    });

    // $routeProvider.when('/palpites/megasena', {
    //   templateUrl: '/palpite/palpite-megasena.html',
    //   controller: 'PalpiteCtrl'
    // });
    $routeProvider.when('/', {
      templateUrl: '/index.html',
      // controller: 'PalpiteController',
    });

  });