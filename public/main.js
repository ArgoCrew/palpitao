angular.module('palpitao', [
    'ngRoute', 
    'ngResource',
    'palpite.megasena',
  ])
  .config(function($locationProvider) {
    // $locationProvider.html5Mode(true);
  })