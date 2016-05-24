using UnityEngine;
using UnityEngine.UI;
using System.Collections;

public class PlayerHearts : MonoBehaviour {

    [SerializeField]
    private Sprite[] _heartSprites;

    [SerializeField]
    private Image _heartSpriteRenderer;

    [SerializeField]
    private HealthPlayer _healthPlayer;

    void Start()
    {
        PlayerActive.ResetHearts += ResetHeart;

        PlayerActive.CheckP1Active += CheckActivityP1;
        PlayerActive.CheckP2Active += CheckActivityP2;

        
        HealthPlayer.ReduceHeart += ChangeSprite;
    }

 
    void CheckActivityP1(PlayerActive player)
    {
        _healthPlayer = GameObject.Find("Player(Clone)").GetComponent<HealthPlayer>();
    }

    void CheckActivityP2(PlayerActive player2)
    {
        _healthPlayer = GameObject.Find("Player 2(Clone)").GetComponent<HealthPlayer>();
    }

    void ChangeSprite(HealthPlayer player)
    {
        if (_healthPlayer.PlayerHealth > 0)
            _heartSpriteRenderer.sprite = _heartSprites[_healthPlayer.PlayerHealth];
        else
            _heartSpriteRenderer.sprite = _heartSprites[0];
    }

    void ResetHeart(PlayerActive player)
    {
            _heartSpriteRenderer.sprite = _heartSprites[5];
    }
}
