import { Assertions, Chain, Guard, Log, Mouse, NamedChain, Pipeline, UiFinder } from '@ephox/agar';
import { UnitTest } from '@ephox/bedrock-client';
import { ApiChains, Editor as McEditor, TinyDom, UiChains } from '@ephox/mcagar';
import { Css, SugarElement } from '@ephox/sugar';

import ImagePlugin from 'tinymce/plugins/image/Plugin';
import SilverTheme from 'tinymce/themes/silver/Theme';
import { cFillActiveDialog } from '../module/Helpers';

UnitTest.asynctest('browser.tinymce.plugins.image.FigureResizeTest', (success, failure) => {

  SilverTheme();
  ImagePlugin();

  const cGetBody = Chain.control(
    Chain.mapper((editor: any) => {
      return TinyDom.fromDom(editor.getBody());
    }),
    Guard.addLogging('Get body')
  );

  const cGetElementSize = Chain.control(
    Chain.mapper((elm: SugarElement<HTMLImageElement>) => {
      const width = Css.get(elm, 'width');
      const height = Css.get(elm, 'height');
      return { width, height };
    }),
    Guard.addLogging('Get element size')
  );

  const cDragHandleRight = function (px) {
    return Chain.control(
      Chain.op((input: any) => {
        const dom = input.editor.dom;
        const target = input.resizeSE.dom;
        const pos = dom.getPos(target);

        dom.fire(target, 'mousedown', { screenX: pos.x, screenY: pos.y });
        dom.fire(target, 'mousemove', { screenX: pos.x + px, screenY: pos.y });
        dom.fire(target, 'mouseup');
      }),
      Guard.addLogging('Drag handle right')
    );
  };

  Pipeline.async({}, [
    Log.chainsAsStep('TBA', 'Image: resizing image in figure', [
      McEditor.cFromSettings({
        theme: 'silver',
        plugins: 'image',
        toolbar: 'image',
        indent: false,
        image_caption: true,
        height: 400,
        base_url: '/project/tinymce/js/tinymce'
      }),
      UiChains.cClickOnToolbar('click image button', 'button[aria-label="Insert/edit image"]'),

      Chain.control(
        cFillActiveDialog({
          src: {
            value: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
          },
          dimensions: {
            width: '100px',
            height: '100px'
          },
          caption: true
        }),
        Guard.tryUntil('Waiting for fill active dialog')
      ),
      UiChains.cSubmitDialog(),
      NamedChain.asChain([
        NamedChain.direct(NamedChain.inputName(), Chain.identity, 'editor'),
        NamedChain.direct('editor', cGetBody, 'editorBody'),
        // click the image, but expect the handles on the figure
        NamedChain.direct('editorBody', UiFinder.cFindIn('figure > img'), 'img'),
        NamedChain.direct('img', Mouse.cTrueClick, '_'),
        NamedChain.direct(NamedChain.inputName(), ApiChains.cAssertSelection([], 0, [], 1), '_'),
        NamedChain.direct('editorBody', Chain.control(
          UiFinder.cFindIn('#mceResizeHandlese'),
          Guard.tryUntil('wait for resize handlers')
        ), '_'),
        // actually drag the handle to the right
        NamedChain.direct('editorBody', UiFinder.cFindIn('#mceResizeHandlese'), 'resizeSE'),
        NamedChain.write('_', cDragHandleRight(100)),
        NamedChain.direct('img', cGetElementSize, 'imgSize'),
        NamedChain.direct('imgSize', Assertions.cAssertEq('asserting image size after resize', { width: '200px', height: '200px' }), '_'),
        NamedChain.output('editor')
      ]),
      McEditor.cRemove
    ])
  ], () => {
    success();
  }, failure);
});
