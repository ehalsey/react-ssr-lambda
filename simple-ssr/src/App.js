// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from "react";
import ProductList from "./components/ProductList";
import axios from "axios";
import getConfig from "./lib/get-config";

const App = ({ isSSR, ssrData }) => {
  const [err, setErr] = useState(false);
  const [result, setResult] = useState({ loading: true, products: null });


  useEffect(() => {
    //const config = await getConfig();
    console.log("here");
    const getData = async () => {
      try {
        const config = await getConfig();
        let result = await axios.get(config.apiUrl);
        setResult({ loading: false, products: result.data });
      } catch (error) {
        setErr(error);
      }
    };
    getData();
  }, []);
  if (err) {
    return <div>Error {err}</div>;
  } else {
    return (
      <div>
        <ProductList result={result} />
      </div>
    );
  }
};

export default App;




