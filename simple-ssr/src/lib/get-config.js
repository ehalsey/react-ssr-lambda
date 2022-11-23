import axios from "axios";
export async function getConfig() {
    var configFile = "./config.json";
    const config = await (await axios.get(configFile)).data;
    console.log(config);
    return config;
  }
