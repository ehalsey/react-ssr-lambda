export async function config() {
    var configFile = "./config.json";
    const getConfig = async () => {
      var response;
      try {
        response = await fetch(configFile);
      }
      catch (error) {
        console.log(`Error ${error.message}`);
        throw error;
      }
      return response.json();
    };
    return getConfig;
  }
