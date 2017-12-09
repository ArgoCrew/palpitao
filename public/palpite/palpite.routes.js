angular.module('palpite.megasena', [])
  .config(function($routeProvider, $httpProvider){ 
    $routeProvider.when('/', {
      templateUrl: '/palpite/palpite.html',
      controller: 'PalpiteController',
    })


    $routeProvider.otherwise({
      redirectTo: '/404',
    });

    $routeProvider.when('/404', {
      templateUrl: '../shared/404.html',
    });

    $routeProvider.when('/palpites/megasena', {
      templateUrl: '/palpite/palpite-megasena.html',
      controller: 'PalpiteCtrl',
      // TODO: hot search: How immplement Google Analytics AB Test "angular"
      // REF 01: https://github.com/peterkhayes/inlineAB
      // title: testAB_megasena_title || [{'BR': 'Palpites para Megasena de Fim de Ano'},
      //                                  {'BR': 'Auamente sua sorte na Megasena de Fim de Ano'}]
    });
    
  });