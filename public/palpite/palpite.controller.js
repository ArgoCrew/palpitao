angular.module('palpite.megasena')
  .controller('PalpiteController', function($scope, $resource, PalpiteMesena) {
    //Variável para atribuir todo objeto dos palpites atribuidos;
    $scope.palpitesMegasena = [];
    //variavel de texto para avisos;
    $scope.mensagem = {textos: ''};
    // Variavel para ativar funçao COLLAPSED em Angular.js
    $scope.active = true;
    //Função AngularJS para pegar todos palpites
    function sugerirPalpitesMegasena() {
      PalpiteMesena.query(
        function(palpites) {
          $scope.palpitesMegasena = palpites;
          $scope.mensagem = {};
        },
        function(erro) {
          console.log(erro);
          $scope.mensagem = {
            texto: 'Não foi possível obter todos Palpites da Megasena! Por favor, tente mais tarde. '
          }
        }
      );
    }
    $scope.exibir = function() {
    sugerirPalpitesMegasena();
      $scope.sugerirPalpitesMegasena = sugerirPalpitesMegasena;    
    }

    function hasClassName(inElement, inClassName)
    {
        var regExp = new RegExp('(?:^|\\s+)' + inClassName + '(?:\\s+|$)');
        return regExp.test(inElement.className);
    }

    function addClassName(inElement, inClassName)
    {
        if (!hasClassName(inElement, inClassName))
            inElement.className = [inElement.className, inClassName].join(' ');
    }

    function removeClassName(inElement, inClassName)
    {
        if (hasClassName(inElement, inClassName)) {
            var regExp = new RegExp('(?:^|\\s+)' + inClassName + '(?:\\s+|$)', 'g');
            var curClasses = inElement.className;
            inElement.className = curClasses.replace(regExp, ' ');
        }
    }

    function toggleClassName(inElement, inClassName)
    {
        if (hasClassName(inElement, inClassName))
            removeClassName(inElement, inClassName);
        else
            addClassName(inElement, inClassName);
    }

    function toggleShape()
    {
      var shape = document.getElementById('shape');
      if (hasClassName(shape, 'ring')) {
        removeClassName(shape, 'ring');
        addClassName(shape, 'cube');
      } else {
        removeClassName(shape, 'cube');
        addClassName(shape, 'ring');
      }
      
      // Move the ring back in Z so it's not so in-your-face.
      var stage = document.getElementById('stage');
      if (hasClassName(shape, 'ring'))
        stage.style.webkitTransform = 'translateZ(-200px)';
      else
        stage.style.webkitTransform = '';
    }
    
    function toggleBackfaces()
    {
      var backfacesVisible = document.getElementById('backfaces').checked;
      var shape = document.getElementById('shape');
      if (backfacesVisible)
        addClassName(shape, 'backfaces');
      else
        removeClassName(shape, 'backfaces');
    }
  });
