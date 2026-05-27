<!-- lens: [n] -->
$[n]$ = $\{1, \ldots, n\}$
<!-- /lens -->

<!-- lens: V(G), E(G) -->
그래프 $G$에 대해 $V(G)$는 정점 집합, $E(G)$는 간선 집합을 뜻한다.
<!-- /lens -->

<!-- lens: N(v) -->
그래프 $G$에서 $N(v)$는 정점 $v$와 인접한 정점들의 집합을 뜻한다.
<!-- /lens -->

<!-- lens: G[X] -->
정점 집합 $X$에 대해 $G[X]$는 $X$로 만들어지는 induced subgraph를 뜻한다. $X$로 만들어지는 induced subgraph란 $(X, \{e = uv \in E(G): u, v \in X\})$를 의미한다.
<!-- /lens -->

<!-- lens: tree decomposition, treewidth -->
그래프 $G$의 tree decomposition $(T, \chi)$는 아래 조건을 만족시키는 pair를 의미한다.

1. $T$는 tree, $\chi$는 $V(T)$에서 $2^{V(G)}$로 가는 map이다.
2. 모든 $v \in V(G)$에 대해 $\{t \in V(T): v \in \chi(t)\}$는 $T$에서 connected subgraph를 이룬다.
3. $uv \in E(G)$라면 $u, v \in \chi(t)$인 $t \in V(T)$가 존재한다.
4. 모든 $v \in V(G)$는 최소 하나의 $\chi(t)$에 속한다.

Tree decomposition의 width는 $\max_{t \in V(T)}|\chi(t)|-1$로 정의된다. 그래프의 treewidth는 가능한 tree decomposition의 width의 최소값을 뜻한다.

자세한 설명은 [이 글](/posts/tree-decomposition/)을 참고하여라.
<!-- /lens -->
