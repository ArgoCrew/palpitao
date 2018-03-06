angular.module('palpite.megasena', [])
  .config(function($routeProvider, $httpProvider){ 
    $routeProvider.when('/', {
      templateUrl: '/palpite/palpite.html',
      controller: 'PalpiteController',
      resolve: {
        delay: function($q, $timeout) {
          var delay = $q.defer();
          $timeout(delay.resolve, 500);
          return delay.promise;
        }
      }
    });

    $routeProvider.when('/404', {
      templateUrl: '../shared/404.html',
    });

    $routeProvider.when('/palpites/megasena', {
      templateUrl: '/palpite/palpite-megasena.html',
      controller: 'PalpiteController',
      // TODO: hot search: How immplement Google Analytics AB Test "angular"
      // REF 01: https://github.com/peterkhayes/inlineAB
      // title: testAB_megasena_title || [{'BR': 'Palpites para Megasena de Fim de Ano'},
      //                                  {'BR': 'Auamente sua sorte na Megasena de Fim de Ano'}]
    });

    $routeProvider.when('/palpites/lotomania', {
      templateUrl: '/palpite/palpite-lotomania.html',
      controller: 'PalpiteController',
      // TODO: hot search: How immplement Google Analytics AB Test "angular"
      // REF 01: https://github.com/peterkhayes/inlineAB
      // title: testAB_megasena_title || [{'BR': 'Palpites para Megasena de Fim de Ano'},
      //                                  {'BR': 'Auamente sua sorte na Megasena de Fim de Ano'}]
    });

    $routeProvider.when('/palpites/lotofacil', {
      templateUrl: '/palpite/palpite-lotofacil.html',
      controller: 'PalpiteController',
      // TODO: hot search: How immplement Google Analytics AB Test "angular"
      // REF 01: https://github.com/peterkhayes/inlineAB
      // title: testAB_megasena_title || [{'BR': 'Palpites para Megasena de Fim de Ano'},
      //                                  {'BR': 'Auamente sua sorte na Megasena de Fim de Ano'}]
    });

    $routeProvider.when('/palpites/quina', {
      templateUrl: '/palpite/palpite-quina.html',
      controller: 'PalpiteController',
      // TODO: hot search: How immplement Google Analytics AB Test "angular"
      // REF 01: https://github.com/peterkhayes/inlineAB
      // title: testAB_megasena_title || [{'BR': 'Palpites para Megasena de Fim de Ano'},
      //                                  {'BR': 'Auamente sua sorte na Megasena de Fim de Ano'}]
    });
    
    $routeProvider.otherwise({
      redirectTo: '/404',
    });

  });