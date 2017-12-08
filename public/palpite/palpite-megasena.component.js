angular.module('palpite.megasena')
  .component('pptPalpiteMegasena', {
    templateUrl: '/palpite/palpite-megasena.component.html',
    // controller: PalpiteMegasenaController,
    bindings: {
      palpites: '=',
    },
  });

// function PalpiteMegasenaController() {
//   var ctrl = this;

//   ctrl.delete = function() {
//     ctrl.onDelete({hero: ctrl.hero});
//   };

//   ctrl.update = function(prop, value) {
//     ctrl.onUpdate({hero: ctrl.hero, prop: prop, value: value});
//   };
// }
