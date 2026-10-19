import React from 'react';
import LondonPage from './LondonPage.tsx';
import LondonHtml from './LondonHtml.tsx';
import { MouseLook } from './MouseLook.tsx';

const LondonWp = () => {
  return (
    <div style={{height:'100%', width:'100%'}}>
      <LondonHtml></LondonHtml>
      <LondonPage><MouseLook></MouseLook> </LondonPage>
    </div>
  );
};

export default LondonWp;
