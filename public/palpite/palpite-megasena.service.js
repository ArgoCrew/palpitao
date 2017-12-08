angular.module('palpite.megasena')
  .factory('PalpiteMesena', ['$resource', function($resource) {
    return $resource('/api/v1/palpites/megasena'); 
  }
  ]);



