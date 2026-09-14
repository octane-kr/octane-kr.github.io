---
kind: post
post: tree-decomposition
---

## tree decomposition | bag | bags

Sqrt decomposition, centroid decomposition 등 PS러에게 익숙한 decomposition은 보통 말 그대로 주어진 대상을 여러 part로 쪼개는 기법들이다. Tree decomposition은 이와는 조금 다른데, 그래프 $G$가 주어지면 가상의 새로운 tree $T$를 옆에 두고 $G$의 각 정점을 $T$의 node 몇 개에 넣는 식으로 이루어진다. 즉 $T$의 node 하나는 $G$의 정점 여러 개를 담고 있고, 이를 bag이라고도 부른다. 이 글에서 각 notation의 엄밀한 type은 정의하지 않고, 때로는 섞어서 사용할 수도 있으니 맥락에 맞게 이해하도록 하자(node와 bag을 혼용할 수 있다는 뜻이며, 정점과 node는 사실 다르지 않지만 벌써 섞어서 쓰고 있다). 또한, 물론 $G$의 한 정점이 $T$의 여러 bag에 들어가기도 한다.

$T$의 node가 주어지면 $G$의 어떤 정점을 담은 bag인지 알려주는 함수를 보통 $\chi$ 혹은 $\beta$라고 쓴다(필자는 $\chi$를 선호한다). 즉, $G$의 tree decomposition은 $(T, \chi)$의 pair로 나타난다. $\chi$의 type은 물론 $V(T) \to 2^{V(G)}$이다. Tree decomposition이 만족해야 하는 성질은 아래와 같다.

1. $G$의 각 정점 $v$에 대해 $v$를 포함하는 bag들은 $T$ 위에서 connected이다.
2. $G$에 간선 $uv$가 존재한다면 $u, v$를 동시에 포함하는 $T$의 bag이 적어도 하나 존재한다.
3. $G$의 각 정점은 최소 한 개의 bag에 들어간다(이 조건에 관해 깊이 생각할 필요는 없다. Isolated vertex를 어디에도 넣지 않는 일 등이 일어나지 않게 하기 위한 사소한 조건이다).

## treewidth | width

따라서, **tree decomposition의 최대 bag의 크기**는 그래프가 tree와 얼마나 비슷한지를 나타내는 유의미한 척도가 될 것이라고 생각할 수 있다. 이를 tree decomposition의 width라고 하자. 이때 자연스럽게 $G$가 고정되었을 때 가능한 tree decomposition 중 width가 가장 작은 것을 택하고 싶을 것이다. 이를 optimal tree decomposition이라고 하며, optimal tree decomposition의 width를 **$G$의 treewidth**라고 한다.

위에서 끝낼 수도 있지만, 사실 width는 최대 bag의 크기에서 1을 뺀 양으로 정의한다. 이유는 그저 tree의 treewidth를 1로 만들고 싶기 때문이다. Treewidth를 쉽게 구할 수 있는 그래프의 예시로는 tree, cycle, cactus, clique 등이 있다(시도해 보라).
