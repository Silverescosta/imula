// Importação de módulos
const express = require("express");
const { engine } = require("express-handlebars");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { title, send } = require("process");
const fileupload = require("express-fileupload");
const fs = require("fs"); // Manipulação de pastas e arquivos

const app = express();
const port = 30003;

// Habilitando upload de arquivos
app.use(fileupload());

// Adicionar Bootstrap
app.use("/bootstrap", express.static("./node_modules/bootstrap/dist"));

// Configuração do Handlebars como motor de templates
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

// Manipulação de dados via rotas
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Conexão com o banco de dados
const conexao = new sqlite3.Database("./imoveis.db", (erro) => {
  if (erro) {
    console.error("Erro ao abrir o banco:", erro.message);
  } else {
    console.log("Conexão com SQLite estabelecida!");
  }
});

// Criar tabela
conexao.serialize(() => {
  conexao.run(
    `   
    CREATE TABLE IF NOT EXISTS imoveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      carac TEXT NOT NULL,
      valor TEXT NOT NULL,
      number TEXT NOT NULL,
      cep TEXT NOT NULL,
      modalidade TEXT NOT NULL,
      imagens TEXT NOT NULL
    )
  `,
    (erro) => {
      if (erro) {
        console.error("Erro ao criar tabela:", erro.message);
      } else {
        console.log("Tabela criada com sucesso!");
      }
    }
  );
});

// Rotas
app.get("/", (req, res) => {
  const sql = "SELECT * FROM imoveis";

  conexao.all(sql, (erro, rows) => {
    if (erro) {
      console.error("Erro ao consultar o banco de dados:", erro.message);
      return res.status(500).send("Erro ao carregar os imoveis.");
    }

    res.render("index", {
      imoveis: rows,
    });
  });
});

app.get("/cadastrar", (req, res) => {
  const sql = "SELECT * FROM imoveis";

  conexao.all(sql, (erro, rows) => {
    if (erro) {
      console.error("Erro ao consultar o banco de dados:", erro.message);
      return res.status(500).send("Erro ao carregar os imoveis.");
    }

    res.render("cadastrar", {
      title: "cadastrar",
      cabecalho: "Cadastrar Imóveis",
      imoveis: rows,
    });

    //sjcnc

    // Log para verificar os dados
    rows.forEach((row) => {
      console.log(`ID: ${row.id}, nome ${row.nome}, carac ${row.carac},  valor ${row.valor},  number ${row.number},  cep ${row.cep}, modalidade ${row.modalidade} imagens ${row.imagens}`);
    });
  });
});

app.post("/cadastro", (req, res) => {
  console.log("Arquivos recebidos:", req.files);
  // Verifica se o arquivo foi enviado
  if (!req.files || !req.files.imagens) {
    return res.status(400).send("Nenhum arquivo foi enviado.");
  }

  let nome = req.body.nome;
  let carac = req.body.carac;
  let valor = req.body.valor;
  let number = req.body.number;
  let cep = req.body.cep;
  let modalidade = req.body.modalidade;
  let imagens = req.files.imagens.name;

  let sql = `INSERT INTO imoveis (nome , carac ,  valor ,  number ,  cep , modalidade , imagens) VALUES (?, ?, ?, ?, ?, ?, ?)`;

  // Executa a inserção no banco de dados
  conexao.run(sql, [nome , carac ,  valor ,  number ,  cep , modalidade , imagens], function (erro) {
    if (erro) {
      console.error("Erro ao inserir no banco de dados:", erro.message);
      return res.status(500).send("Erro ao cadastrar o imóveo.");
    }

    // Move o arquivo para o diretório desejado
    req.files.imagens.mv(
      __dirname + "/public/images/uploads/" + imagens,
      (err) => {
        if (err) {
          console.error("Erro ao mover o arquivo:", err.message);
          return res.status(500).send("Erro ao salvar a imagem.");
        }
        console.log("Produto cadastrado com sucesso:", this.lastID);
        res.redirect("/cadastrar");
      }
    );
  });
});

app.post("/atualizar", (req, res) => {
  let id = req.body.id;
  let nome = req.body.nome;
  let carac = req.body.carac;
  let valor = req.body.valor;
  let number = req.body.number;
  let cep = req.body.cep;
  let modalidade = req.body.modalidade;
  let sql = `UPDATE imoveis SET nome = ?, carac = ?, valor = ?, number = ?, cep = ?, modalidade = ? WHERE id = ?`;

  // Se uma nova imagem for enviada
  if (req.files && req.files.imagens) {
    let imagens = req.files.imagens.name;

    conexao.run(sql, [nome, carac, valor, number, cep, modalidade, id], function (erro) {
      if (erro) {
        console.error("Erro ao atualizar o banco de dados:", erro.message);
        return res.status(500).send("Erro ao atualizar o produto.");
      }

      // Substitui a imagem antiga
      req.files.imagens.mv(
        __dirname + "/public/images/uploads/" + imagens,
        (err) => {
          if (err) {
            console.error("Erro ao mover o arquivo:", err.message);
            return res.status(500).send("Erro ao salvar a nova imagem.");
          }
          console.log("Imóvel atualizado com sucesso:", id);
          res.redirect("/");
        }
      );
    });
  } else {
    // Atualiza o banco de dados sem alterar a imagem
    conexao.run(sql, [nome, carac, valor, number, cep, modalidade, id], function (erro) {
      if (erro) {
        console.error("Erro ao atualizar o banco de dados:", erro.message);
        return res.status(500).send("Erro ao atualizar o produto.");
      }

      console.log("Produto atualizado com sucesso:", id);
      res.redirect("/");
    });
  }
});

app.get("/pesquisa", (req, res) => {
  const nome = req.query.nome || ""; // Recebe o termo da URL
  const sql = "SELECT * FROM imoveis WHERE nome LIKE ?";

  conexao.all(sql, [`%${nome}%`], (erro, resultados) => {
    if (erro) {
      console.error("Erro ao buscar resultados:", erro.message);
      return res.status(500).send("Erro no servidor.");
    }

    res.render("pesquisa", {
      title: "Pesquisar Produtos",
      cabecalho: "Resultados da Pesquisa",
      produtos: resultados,
      termo: nome, // Para manter o termo no input de pesquisa
    });
  });
});


app.get("/editar/:id", (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).send("ID não informado.");
  }

  let sql = `SELECT * FROM imoveis WHERE id = ?`;

  conexao.get(sql, [id], (erro, rows) => {
    if (erro) {
      console.error("Erro ao consultar o banco de dados:", erro.message);
      return res.status(500).send("Erro ao carregar o produto.");
    }

    res.render("editar", {
      title: "Editar",
      cabecalho: "Editar Informações",
      personagem: rows,
    });
  });
});

app.get("/remover/:id/:imagens", (req, res) => {
  const id = req.params.id;
  const imagens = req.params.imagens;

  // Validação dos parâmetros
  if (!id || !imagens) {
    return res.status(400).send("Parâmetros inválidos.");
  }

  // SQL seguro com placeholders
  let sql = `DELETE FROM imoveis WHERE id = ?`;

  conexao.run(sql, [id], function (erro) {
    if (erro) {
      console.error("Erro ao remover do banco de dados:", erro.message);
      return res.status(500).send("Erro ao remover o produto.");
    }

    // Verificar se a variável imagens está definida corretamente
    if (!imagens || typeof imagens !== 'string') {
      console.error("Erro: a variável 'imagens' não está definida corretamente.");
      return res.status(500).send("Erro interno do servidor.");
    }

    // Remover a imagem associada
    const imagensPath = path.join(__dirname, "public/images/uploads", imagens);

    fs.unlink(imagensPath, (erroImagens) => {
      if (erroImagens) {
        console.error("Erro ao remover a imagem:", erroImagens.message);
        return res.status(500).send("Erro ao remover a imagem do servidor.");
      }

      console.log("Produto e imagem removidos com sucesso!");
      res.redirect("/");
    });
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando em: http://localhost:${port}`);
});