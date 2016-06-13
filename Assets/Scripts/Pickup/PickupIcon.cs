using UnityEngine;
using System.Collections;

public class PickupIcon : MonoBehaviour
{
    //Array of our icons
    [SerializeField] private Sprite[] weaponIcon;
    //SpriteRenderer attachted to this object
    [SerializeField] private SpriteRenderer spriteRenderer;
    private bool canMove;
    private float speed = 1f;
    private Vector2 targetPos;

    public void SetWeaponIcon(int index)
    {
        spriteRenderer.sprite = weaponIcon[index];
        gameObject.AddComponent<Fade>();
        targetPos = new Vector2 (transform.position.x, transform.position.y + 1);
        canMove = true;
    }

    void Update()
    {
        if (canMove)
            MoveSprite();
    }

    void MoveSprite()
    {
        float step = speed * Time.deltaTime;
        transform.position = Vector2.MoveTowards(transform.position, targetPos, step);
    }
}
