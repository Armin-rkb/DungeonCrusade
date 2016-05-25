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

    [SerializeField]
    private HealthPlayer _healthPlayer2;

    void Start()
    {

        PlayerActive.ResetP1Heart += ResetP1Heart;
        PlayerActive.ResetP2Heart += ResetP2Heart;

        PlayerActive.CheckP1Active += CheckActivityP1;
        PlayerActive.CheckP2Active += CheckActivityP2;


        /*
         * Simply adding these functions to the delegates
         * they all belong to.
         */

        if (this.gameObject.name == "P1Hearts")
        HealthPlayer.ReduceP1Heart += ChangeP1Sprite;
        else
        HealthPlayer.ReduceP2Heart += ChangeP2Sprite;

        /*
         * Checks which object to use for which function.
         */
    }


       void CheckActivityP1(PlayerActive player)
    {
        _healthPlayer = GameObject.Find("Player(Clone)").GetComponent<HealthPlayer>();
    }

       void CheckActivityP2(PlayerActive player2)
       {
           _healthPlayer2 = GameObject.Find("Player 2(Clone)").GetComponent<HealthPlayer>();
       }


    void ChangeP1Sprite(HealthPlayer player)
    {
        if (_healthPlayer.PlayerHealth > 0)
            _heartSpriteRenderer.sprite = _heartSprites[_healthPlayer.PlayerHealth];
        else
            _heartSpriteRenderer.sprite = _heartSprites[0];
    }

    void ChangeP2Sprite(HealthPlayer player2)
    {
        if (_healthPlayer2.PlayerHealth > 0)
            _heartSpriteRenderer.sprite = _heartSprites[_healthPlayer2.PlayerHealth];
        else
            _heartSpriteRenderer.sprite = _heartSprites[0];
    }


    void ResetP1Heart(PlayerActive player)
    {
        if (this.gameObject.name == "P1Hearts")
            _heartSpriteRenderer.sprite = _heartSprites[5];
    }

    void ResetP2Heart(PlayerActive player2)
    {
        if (this.gameObject.name == "P2Hearts")
        _heartSpriteRenderer.sprite = _heartSprites[5];
    }
}
