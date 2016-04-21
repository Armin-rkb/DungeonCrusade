using UnityEngine;
using System.Collections;

public class PlayerAnimations : MonoBehaviour {

    [SerializeField]
    private Sprite[] _spriteCollection;

    private SpriteRenderer _playerSpriteRenderer;

    void Start()
    {
        _playerSpriteRenderer = this.GetComponent<SpriteRenderer>();
    }

	// Update is called once per frame
	void Update () {
        if (Input.GetAxis("Horizontal") >= 0.001)
            _playerSpriteRenderer.sprite = _spriteCollection[1];
        else if (Input.GetAxis("Horizontal") <= -0.001)
            _playerSpriteRenderer.sprite = _spriteCollection[2];
        else if (Input.GetAxis("Vertical") >= 0.001)
            _playerSpriteRenderer.sprite = _spriteCollection[3];
        else if (Input.GetAxis("Vertical") <= -0.001)
            _playerSpriteRenderer.sprite = _spriteCollection[4];
        else
            _playerSpriteRenderer.sprite = _spriteCollection[0];
	}
}
